from pydantic import BaseModel


class IngredientBase(BaseModel):
    name: str
    calories: float | None = None
    protein: float | None = None
    fat: float | None = None
    carbs: float | None = None


class IngredientOut(IngredientBase):
    id: int
    model_config = {"from_attributes": True}


class RecipeIngredientIn(BaseModel):
    ingredient_name: str
    amount: float | None = None
    unit: str | None = None


class RecipeIngredientOut(BaseModel):
    ingredient: IngredientOut
    amount: float | None = None
    unit: str | None = None
    model_config = {"from_attributes": True}


class RecipeCreate(BaseModel):
    title: str
    description: str | None = None
    steps: str | None = None  # JSON-строка
    servings: int = 4
    cook_time_minutes: int | None = None
    source: str | None = None
    tags: list[str] = []
    ingredients: list[RecipeIngredientIn] = []


class RecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    steps: str | None = None
    servings: int | None = None
    cook_time_minutes: int | None = None
    source: str | None = None
    tags: list[str] | None = None
    ingredients: list[RecipeIngredientIn] | None = None


class RecipeOut(BaseModel):
    id: int
    title: str
    description: str | None
    steps: str | None
    servings: int
    cook_time_minutes: int | None
    source: str | None
    photo_path: str | None
    author_id: int
    tags: list[str]
    ingredients: list[RecipeIngredientOut]
    is_favorite: bool = False

    model_config = {"from_attributes": True}


class RecipeListItem(BaseModel):
    id: int
    title: str
    description: str | None
    servings: int
    cook_time_minutes: int | None
    photo_path: str | None
    tags: list[str]
    is_favorite: bool = False

    model_config = {"from_attributes": True}
