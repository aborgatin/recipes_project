import { useEffect, useState } from 'react'
import { getShoppingList, generateFromRecipes, addItem, toggleItem, deleteItem, clearList } from '../api/shopping'
import { getRecipes } from '../api/recipes'

function RecipePicker({ onGenerate }) {
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [replace, setReplace] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) getRecipes().then(setRecipes)
  }, [open])

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    await onGenerate([...selected], replace)
    setSelected(new Set())
    setOpen(false)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700"
      >
        + Добавить из рецептов
      </button>

      {open && (
        <div className="mt-3 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-3">Выберите рецепты:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {recipes.map(r => (
              <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-gray-800">{r.title}</span>
                {r.servings && <span className="text-xs text-gray-400">{r.servings} порц.</span>}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={replace}
              onChange={e => setReplace(e.target.checked)}
              className="accent-emerald-600"
            />
            Заменить текущий список
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={selected.size === 0}
              className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Добавить в список ({selected.size})
            </button>
            <button
              onClick={() => setOpen(false)}
              className="border border-gray-200 text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddCustomItem({ onAdd }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd(name.trim(), amount ? Number(amount) : null, unit || null)
    setName('')
    setAmount('')
    setUnit('')
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2">
      <input
        placeholder="Название"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="number"
        placeholder="Кол-во"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        placeholder="ед."
        value={unit}
        onChange={e => setUnit(e.target.value)}
        className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200"
      >
        +
      </button>
    </form>
  )
}

export default function ShoppingListPage() {
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await getShoppingList()
    setList(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleGenerate(ids, replace) {
    const data = await generateFromRecipes(ids, replace)
    setList(data)
  }

  async function handleToggle(id) {
    const data = await toggleItem(id)
    setList(data)
  }

  async function handleDelete(id) {
    const data = await deleteItem(id)
    setList(data)
  }

  async function handleAdd(name, amount, unit) {
    const data = await addItem(name, amount, unit)
    setList(data)
  }

  async function handleClear() {
    if (!confirm('Очистить список?')) return
    await clearList()
    setList(prev => ({ ...prev, items: [] }))
  }

  if (loading) return <div className="text-center text-gray-400 py-20">Загрузка...</div>

  const unchecked = list.items.filter(i => !i.is_checked)
  const checked = list.items.filter(i => i.is_checked)

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Список покупок</h1>
        {list.items.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-600">
            Очистить
          </button>
        )}
      </div>

      <div className="mb-6">
        <RecipePicker onGenerate={handleGenerate} />
      </div>

      <div className="mb-4">
        <AddCustomItem onAdd={handleAdd} />
      </div>

      {list.items.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">🛒</p>
          <p>Список пуст — добавьте рецепты или товары вручную</p>
        </div>
      ) : (
        <div className="space-y-1">
          {unchecked.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
              <button
                onClick={() => handleToggle(item.id)}
                className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center flex-shrink-0 hover:border-emerald-500"
              />
              <span className="flex-1 text-sm text-gray-800 capitalize">{item.name}</span>
              {item.amount && (
                <span className="text-sm text-gray-400">
                  {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(1)} {item.unit}
                </span>
              )}
              <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
            </div>
          ))}

          {checked.length > 0 && (
            <>
              <p className="text-xs text-gray-400 pt-4 pb-1">Куплено</p>
              {checked.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 opacity-50">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm text-gray-500 line-through capitalize">{item.name}</span>
                  {item.amount && (
                    <span className="text-sm text-gray-300">
                      {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(1)} {item.unit}
                    </span>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
