import client from './client'

export async function getShoppingList() {
  const { data } = await client.get('/shopping')
  return data
}

export async function generateFromRecipes(recipe_ids, replace = false) {
  const { data } = await client.post('/shopping/generate', { recipe_ids, replace })
  return data
}

export async function addItem(name, amount, unit) {
  const { data } = await client.post('/shopping/items', { name, amount, unit })
  return data
}

export async function toggleItem(id) {
  const { data } = await client.patch(`/shopping/items/${id}`)
  return data
}

export async function deleteItem(id) {
  const { data } = await client.delete(`/shopping/items/${id}`)
  return data
}

export async function clearList() {
  await client.delete('/shopping/clear')
}
