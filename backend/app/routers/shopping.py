from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.recipe import Recipe, RecipeIngredient
from app.models.shopping import ShoppingList, ShoppingListItem
from app.schemas.shopping import ShoppingListOut, ShoppingItemAdd, GenerateFromRecipes
from app.core.deps import current_user

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


async def _get_or_create_list(db: AsyncSession, user_id: int) -> ShoppingList:
    sl = await db.scalar(
        select(ShoppingList)
        .where(ShoppingList.user_id == user_id)
        .options(selectinload(ShoppingList.items))
    )
    if not sl:
        sl = ShoppingList(user_id=user_id)
        db.add(sl)
        await db.flush()
        sl = await db.scalar(
            select(ShoppingList)
            .where(ShoppingList.user_id == user_id)
            .options(selectinload(ShoppingList.items))
        )
    return sl


@router.get("", response_model=ShoppingListOut)
async def get_list(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    sl = await _get_or_create_list(db, user.id)
    await db.commit()
    return sl


@router.post("/generate", response_model=ShoppingListOut)
async def generate_from_recipes(
    data: GenerateFromRecipes,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    sl = await _get_or_create_list(db, user.id)

    if data.replace:
        for item in sl.items:
            await db.delete(item)
        await db.flush()
        sl.items = []

    # Aggregate ingredients from selected recipes
    aggregated: dict[tuple[str, str], float] = {}
    for recipe_id in data.recipe_ids:
        recipe = await db.scalar(
            select(Recipe)
            .where(Recipe.id == recipe_id)
            .options(selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient))
        )
        if not recipe:
            continue
        for ri in recipe.ingredients:
            key = (ri.ingredient.name, ri.unit)
            aggregated[key] = aggregated.get(key, 0) + ri.amount

    # Merge with existing unchecked items or add new
    existing = {(i.name, i.unit or ""): i for i in sl.items if not i.is_checked}
    for (name, unit), amount in aggregated.items():
        key = (name, unit)
        if key in existing:
            existing[key].amount = (existing[key].amount or 0) + amount
        else:
            item = ShoppingListItem(list_id=sl.id, name=name, amount=amount, unit=unit)
            db.add(item)

    await db.commit()
    sl = await db.scalar(
        select(ShoppingList)
        .where(ShoppingList.id == sl.id)
        .options(selectinload(ShoppingList.items))
    )
    return sl


@router.post("/items", response_model=ShoppingListOut)
async def add_item(
    data: ShoppingItemAdd,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    sl = await _get_or_create_list(db, user.id)
    db.add(ShoppingListItem(list_id=sl.id, name=data.name, amount=data.amount, unit=data.unit))
    await db.commit()
    sl = await db.scalar(
        select(ShoppingList)
        .where(ShoppingList.id == sl.id)
        .options(selectinload(ShoppingList.items))
    )
    return sl


@router.patch("/items/{item_id}", response_model=ShoppingListOut)
async def toggle_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    item = await db.get(ShoppingListItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_checked = not item.is_checked
    await db.commit()
    sl = await db.scalar(
        select(ShoppingList)
        .where(ShoppingList.id == item.list_id)
        .options(selectinload(ShoppingList.items))
    )
    return sl


@router.delete("/items/{item_id}", response_model=ShoppingListOut)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    item = await db.get(ShoppingListItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    list_id = item.list_id
    await db.delete(item)
    await db.commit()
    sl = await db.scalar(
        select(ShoppingList)
        .where(ShoppingList.id == list_id)
        .options(selectinload(ShoppingList.items))
    )
    return sl


@router.delete("/clear", status_code=204)
async def clear_list(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    sl = await _get_or_create_list(db, user.id)
    for item in sl.items:
        await db.delete(item)
    await db.commit()
