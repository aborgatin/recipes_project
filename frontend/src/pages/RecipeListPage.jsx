import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRecipes, toggleFavorite } from '../api/recipes'

function RecipeCard({ recipe, onFavoriteToggle }) {
  const [fav, setFav] = useState(recipe.is_favorite)

  async function handleFav(e) {
    e.preventDefault()
    await toggleFavorite(recipe.id)
    setFav(f => !f)
    onFavoriteToggle?.()
  }

  return (
    <Link to={`/recipes/${recipe.id}`} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-44 bg-gray-100 relative">
        {recipe.photo_path ? (
          <img src={recipe.photo_path} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        <button
          onClick={handleFav}
          className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-lg"
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
          {recipe.cook_time_minutes && <span>⏱ {recipe.cook_time_minutes} мин</span>}
          <span>👤 {recipe.servings} порц.</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.map(tag => (
              <span key={tag} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function RecipeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const favoritesOnly = searchParams.get('favorites_only') === 'true'

  async function load() {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (favoritesOnly) params.favorites_only = true
    const data = await getRecipes(params)
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [searchParams])

  function handleSearch(e) {
    e.preventDefault()
    setSearchParams(search ? { search } : {})
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Поиск рецептов..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          Найти
        </button>
        {(search || favoritesOnly) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchParams({}) }}
            className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Сбросить
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Загрузка...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-4xl mb-3">🍽️</p>
          <p>Рецептов пока нет</p>
          <Link to="/recipes/new" className="text-emerald-600 text-sm mt-2 inline-block hover:underline">
            Добавить первый рецепт
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r} onFavoriteToggle={load} />
          ))}
        </div>
      )}
    </div>
  )
}
