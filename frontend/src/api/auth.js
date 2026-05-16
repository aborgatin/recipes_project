import client from './client'

export async function register(email, name, password) {
  const { data } = await client.post('/auth/register', { email, name, password })
  return data
}

export async function login(email, password) {
  const form = new URLSearchParams({ username: email, password })
  const { data } = await client.post('/auth/login', form)
  return data
}

export async function getMe() {
  const { data } = await client.get('/auth/me')
  return data
}
