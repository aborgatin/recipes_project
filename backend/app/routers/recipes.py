import json
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.recipe import Recipe, Ingredient, RecipeIngredient, Tag, Favorite
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeOut, RecipeListItem
from app.core.deps import current_user
from app.core.config import settings

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _load_recipe_query():
    return select(Recipe).options(
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient),
        selectinload(Recipe.tags),
        selectinload(Recipe.favorites),
    )


async def _get_or_create_tag(db: AsyncSession, name: str) -> Tag:
    tag = await db.scalar(select(Tag).where(Tag.name == name.lower()))
    if not tag:
        tag = Tag(name=name.lower())
        db.add(tag)
        await db.flush()
    return tag


async def _get_or_create_ingredient(db: AsyncSession, name: str) -> Ingredient:
    ingredient = await db.scalar(select(Ingredient).where(Ingredient.name == name.lower()))
    if not ingredient:
        ingredient = Ingredient(name=name.lower())
        db.add(ingredient)
        await db.flush()
    return ingredient


def _serialize(recipe: Recipe, user_id: int) -> dict:
    favorite_ids = {f.user_id for f in recipe.favorites}
    return {
        "id": recipe.id,
        "title": recipe.title,
        "description": recipe.description,
        "steps": recipe.steps,
        "servings": recipe.servings,
        "cook_time_minutes": recipe.cook_time_minutes,
        "source": recipe.source,
        "photo_path": recipe.photo_path,
        "author_id": recipe.author_id,
        "tags": [t.name for t in recipe.tags],
        "ingredients": [
            {
                "ingredient": {
                    "id": ri.ingredient.id,
                    "name": ri.ingredient.name,
                    "calories": ri.ingredient.calories,
                    "protein": ri.ingredient.protein,
                    "fat": ri.ingredient.fat,
                    "carbs": ri.ingredient.carbs,
                },
                "amount": ri.amount,
                "unit": ri.unit,
            }
            for ri in recipe.ingredients
        ],
        "is_favorite": user_id in favorite_ids,
    }


@router.get("", response_model=list[RecipeListItem])
async def list_recipes(
    tag: str | None = Query(None),
    ingredient: str | None = Query(None),
    search: str | None = Query(None),
    favorites_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    q = _load_recipe_query()

    if tag:
        q = q.join(Recipe.tags).where(Tag.name == tag.lower())
    if ingredient:
        q = q.join(Recipe.ingredients).join(RecipeIngredient.ingredient).where(
            Ingredient.name.icontains(ingredient)
        )
    if search:
        q = q.where(Recipe.title.icontains(search))
    if favorites_only:
        q = q.join(Recipe.favorites).where(Favorite.user_id == user.id)

    result = await db.scalars(q)
    recipes = result.unique().all()

    favorite_ids = {f.user_id for r in recipes for f in r.favorites}

    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "servings": r.servings,
            "cook_time_minutes": r.cook_time_minutes,
            "photo_path": r.photo_path,
            "tags": [t.name for t in r.tags],
            "is_favorite": user.id in {f.user_id for f in r.favorites},
        }
        for r in recipes
    ]


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(recipe_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    recipe = await db.scalar(_load_recipe_query().where(Recipe.id == recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _serialize(recipe, user.id)


@router.post("", response_model=RecipeOut, status_code=201)
async def create_recipe(data: RecipeCreate, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    recipe = Recipe(
        title=data.title,
        description=data.description,
        steps=data.steps,
        servings=data.servings,
        cook_time_minutes=data.cook_time_minutes,
        source=data.source,
        author_id=user.id,
    )
    db.add(recipe)
    await db.flush()

    for tag_name in data.tags:
        tag = await _get_or_create_tag(db, tag_name)
        recipe.tags.append(tag)

    for ri_data in data.ingredients:
        ingredient = await _get_or_create_ingredient(db, ri_data.ingredient_name)
        ri = RecipeIngredient(recipe_id=recipe.id, ingredient_id=ingredient.id, amount=ri_data.amount, unit=ri_data.unit)
        db.add(ri)

    await db.commit()
    recipe = await db.scalar(_load_recipe_query().where(Recipe.id == recipe.id))
    return _serialize(recipe, user.id)


@router.patch("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: int, data: RecipeUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)
):
    recipe = await db.scalar(_load_recipe_query().where(Recipe.id == recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for field in ("title", "description", "steps", "servings", "cook_time_minutes", "source"):
        value = getattr(data, field)
        if value is not None:
            setattr(recipe, field, value)

    if data.tags is not None:
        recipe.tags.clear()
        for tag_name in data.tags:
            recipe.tags.append(await _get_or_create_tag(db, tag_name))

    if data.ingredients is not None:
        await db.execute(delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id))
        for ri_data in data.ingredients:
            ingredient = await _get_or_create_ingredient(db, ri_data.ingredient_name)
            db.add(RecipeIngredient(recipe_id=recipe.id, ingredient_id=ingredient.id, amount=ri_data.amount, unit=ri_data.unit))

    await db.commit()
    recipe = await db.scalar(_load_recipe_query().where(Recipe.id == recipe.id))
    return _serialize(recipe, user.id)


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.delete(recipe)
    await db.commit()


@router.post("/{recipe_id}/photo", response_model=RecipeOut)
async def upload_photo(
    recipe_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(settings.upload_dir, filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    if recipe.photo_path:
        old = os.path.join(settings.upload_dir, os.path.basename(recipe.photo_path))
        if os.path.exists(old):
            os.remove(old)

    recipe.photo_path = f"/uploads/{filename}"
    await db.commit()

    recipe = await db.scalar(_load_recipe_query().where(Recipe.id == recipe.id))
    return _serialize(recipe, user.id)


@router.post("/{recipe_id}/favorite", status_code=204)
async def toggle_favorite(recipe_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    fav = await db.get(Favorite, (user.id, recipe_id))
    if fav:
        await db.delete(fav)
    else:
        db.add(Favorite(user_id=user.id, recipe_id=recipe_id))
    await db.commit()
