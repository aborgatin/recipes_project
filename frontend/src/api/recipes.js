import client from './client'

export async function getRecipes(params = {}) {
  const { data } = await client.get('/recipes', { params })
  return data
}

export async function getRecipe(id) {
  const { data } = await client.get(`/recipes/${id}`)
  return data
}

export async function createRecipe(payload) {
  const { data } = await client.post('/recipes', payload)
  return data
}

export async function updateRecipe(id, payload) {
  const { data } = await client.patch(`/recipes/${id}`, payload)
  return data
}

export async function deleteRecipe(id) {
  await client.delete(`/recipes/${id}`)
}

export async function uploadPhoto(id, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post(`/recipes/${id}/photo`, form)
  return data
}

export async function toggleFavorite(id) {
  await client.post(`/recipes/${id}/favorite`)
}
