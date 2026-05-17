import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRecipe, updateRecipe, getRecipe } from '../api/recipes'

const UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ст.л.', 'ч.л.', 'щепотка']

function IngredientRow({ ingredient, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        placeholder="Название"
        value={ingredient.ingredient_name}
        onChange={e => onChange(index, 'ingredient_name', e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="number"
        placeholder="Кол-во"
        value={ingredient.amount}
        onChange={e => onChange(index, 'amount', e.target.value)}
        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <select
        value={ingredient.unit}
        onChange={e => onChange(index, 'unit', e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {UNITS.map(u => <option key={u}>{u}</option>)}
      </select>
      <button onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
    </div>
  )
}

export default function RecipeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState(4)
  const [tags, setTags] = useState('')
  const [steps, setSteps] = useState([''])
  const [ingredients, setIngredients] = useState([{ ingredient_name: '', amount: '', unit: 'г' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    getRecipe(id).then(r => {
      setTitle(r.title)
      setDescription(r.description || '')
      setSource(r.source || '')
      setCookTime(r.cook_time_minutes || '')
      setServings(r.servings)
      setTags(r.tags.join(', '))
      try { setSteps(JSON.parse(r.steps || '[]').length ? JSON.parse(r.steps) : ['']) }
      catch { setSteps([r.steps || '']) }
      setIngredients(
        r.ingredients.length
          ? r.ingredients.map(ri => ({ ingredient_name: ri.ingredient.name, amount: ri.amount, unit: ri.unit }))
          : [{ ingredient_name: '', amount: '', unit: 'г' }]
      )
    })
  }, [id])

  function updateIngredient(index, field, value) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }

  function removeIngredient(index) {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  function updateStep(index, value) {
    setSteps(prev => prev.map((s, i) => i === index ? value : s))
  }

  function removeStep(index) {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        title,
        description: description || null,
        source: source || null,
        cook_time_minutes: cookTime ? Number(cookTime) : null,
        servings: Number(servings),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        steps: JSON.stringify(steps.filter(s => s.trim())),
        ingredients: ingredients.filter(i => i.ingredient_name.trim()).map(i => ({
          ...i,
          amount: Number(i.amount),
        })),
      }
      const result = isEdit ? await updateRecipe(id, payload) : await createRecipe(payload)
      navigate(`/recipes/${result.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Изменить рецепт' : 'Новый рецепт'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Время (мин)</label>
            <input
              type="number"
              value={cookTime}
              onChange={e => setCookTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Порций</label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={e => setServings(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Источник</label>
          <input
            placeholder="https://... или «Бабушкина тетрадь»"
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Теги (через запятую)</label>
          <input
            placeholder="суп, быстро, курица"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ингредиенты</label>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <IngredientRow key={i} ingredient={ing} index={i} onChange={updateIngredient} onRemove={removeIngredient} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIngredients(prev => [...prev, { ingredient_name: '', amount: '', unit: 'г' }])}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            + Добавить ингредиент
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Шаги приготовления</label>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-6 h-6 mt-2 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <textarea
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  rows={2}
                  placeholder={`Шаг ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <button onClick={() => removeStep(i)} className="text-gray-400 hover:text-red-500 text-lg mt-1 px-1">×</button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSteps(prev => [...prev, ''])}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            + Добавить шаг
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать рецепт'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-gray-200 px-6 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
