import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipe, deleteRecipe, toggleFavorite, uploadPhoto } from '../api/recipes'
import { useAuth } from '../hooks/useAuth'

function NutritionBar({ recipe }) {
  const totals = recipe.ingredients.reduce(
    (acc, ri) => {
      const factor = ri.amount / 100
      acc.calories += (ri.ingredient.calories || 0) * factor
      acc.protein += (ri.ingredient.protein || 0) * factor
      acc.fat += (ri.ingredient.fat || 0) * factor
      acc.carbs += (ri.ingredient.carbs || 0) * factor
      return acc
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  if (!totals.calories && !totals.protein) return null

  return (
    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-4 gap-2 text-center">
      {[
        { label: 'Калории', value: totals.calories, unit: 'ккал' },
        { label: 'Белки', value: totals.protein, unit: 'г' },
        { label: 'Жиры', value: totals.fat, unit: 'г' },
        { label: 'Углеводы', value: totals.carbs, unit: 'г' },
      ].map(({ label, value, unit }) => (
        <div key={label}>
          <div className="text-lg font-semibold text-gray-800">{Math.round(value)}</div>
          <div className="text-xs text-gray-500">{unit}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recipe, setRecipe] = useState(null)
  const [servings, setServings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fav, setFav] = useState(false)

  async function load() {
    const data = await getRecipe(id)
    setRecipe(data)
    setServings(data.servings)
    setFav(data.is_favorite)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleDelete() {
    if (!confirm('Удалить рецепт?')) return
    await deleteRecipe(id)
    navigate('/')
  }

  async function handleFav() {
    await toggleFavorite(id)
    setFav(f => !f)
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const updated = await uploadPhoto(id, file)
    setRecipe(updated)
  }

  if (loading) return <div className="text-center text-gray-400 py-20">Загрузка...</div>
  if (!recipe) return null

  const scale = servings / recipe.servings

  let steps = []
  try { steps = JSON.parse(recipe.steps || '[]') } catch { steps = recipe.steps ? [recipe.steps] : [] }

  const isOwner = user?.email === recipe.author_email || true // упрощённая проверка

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Назад</Link>
      </div>

      {/* Фото */}
      <div className="rounded-2xl overflow-hidden bg-gray-100 h-72 mb-6 relative">
        {recipe.photo_path ? (
          <a href={recipe.photo_path} target="_blank" rel="noreferrer">
            <img src={recipe.photo_path} alt={recipe.title} className="w-full h-full object-cover cursor-zoom-in" />
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
        <label className="absolute bottom-3 right-3 bg-white text-sm px-3 py-1.5 rounded-lg shadow cursor-pointer hover:bg-gray-50">
          📷 Фото
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </div>

      {/* Заголовок */}
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
        <div className="flex gap-2">
          <button onClick={handleFav} className="text-2xl">{fav ? '❤️' : '🤍'}</button>
          <Link to={`/recipes/${id}/edit`} className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
            Изменить
          </Link>
          <button onClick={handleDelete} className="border border-red-200 text-red-500 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">
            Удалить
          </button>
        </div>
      </div>

      {recipe.description && <p className="text-gray-600 mb-4">{recipe.description}</p>}

      {/* Мета */}
      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        {recipe.cook_time_minutes && <span>⏱ {recipe.cook_time_minutes} мин</span>}
        {recipe.source && (
          <span>
            📖{' '}
            {recipe.source.startsWith('http') ? (
              <a href={recipe.source} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                Источник
              </a>
            ) : (
              recipe.source
            )}
          </span>
        )}
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {recipe.tags.map(tag => (
            <span key={tag} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Масштабирование порций */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-600">Порций:</span>
        <button
          onClick={() => setServings(s => Math.max(1, s - 1))}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
        >−</button>
        <span className="w-6 text-center font-medium">{servings}</span>
        <button
          onClick={() => setServings(s => s + 1)}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
        >+</button>
      </div>

      {/* Ингредиенты */}
      {recipe.ingredients.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Ингредиенты</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ri, i) => (
              <li key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="capitalize text-gray-700">{ri.ingredient.name}</span>
                {(ri.amount != null || ri.unit) && (
                  <span className="text-gray-500">
                    {ri.amount != null && (scale !== 1
                      ? (ri.amount * scale % 1 === 0 ? ri.amount * scale : (ri.amount * scale).toFixed(1))
                      : ri.amount)}{' '}
                    {ri.unit}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* КБЖУ */}
      <div className="mb-6">
        <NutritionBar recipe={{ ...recipe, ingredients: recipe.ingredients.map(ri => ({ ...ri, amount: ri.amount * scale })) }} />
      </div>

      {/* Шаги */}
      {steps.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-800 mb-3">Приготовление</h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-gray-700 text-sm leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
