from pydantic import BaseModel


class ShoppingItemOut(BaseModel):
    id: int
    name: str
    amount: float | None
    unit: str | None
    is_checked: bool

    model_config = {"from_attributes": True}


class ShoppingListOut(BaseModel):
    id: int
    items: list[ShoppingItemOut]

    model_config = {"from_attributes": True}


class ShoppingItemAdd(BaseModel):
    name: str
    amount: float | None = None
    unit: str | None = None


class GenerateFromRecipes(BaseModel):
    recipe_ids: list[int]
    replace: bool = False
