import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SHEETS_API_URL = import.meta.env.VITE_SHEETS_API_URL

function loadTodos() {
  try {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function syncToSheet(action, payload) {
  if (!SHEETS_API_URL) return Promise.resolve()
  return fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  })
}

function App() {
  const [todos, setTodos] = useState(loadTodos)
  const [inputValue, setInputValue] = useState('')
  const [syncError, setSyncError] = useState(null)

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    if (!SHEETS_API_URL) return
    fetch(SHEETS_API_URL)
      .then((res) => res.json())
      .then((data) => setTodos(data))
      .catch(() =>
        setSyncError('구글 시트를 불러오지 못했습니다. 로컬 데이터를 표시합니다.')
      )
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const newTodo = { id: crypto.randomUUID(), text: trimmed, completed: false }
    setTodos((prev) => [...prev, newTodo])
    setInputValue('')
    syncToSheet('add', newTodo).catch(() =>
      setSyncError('구글 시트에 저장하지 못했습니다.')
    )
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
    syncToSheet('toggle', { id }).catch(() =>
      setSyncError('구글 시트에 저장하지 못했습니다.')
    )
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    syncToSheet('delete', { id }).catch(() =>
      setSyncError('구글 시트에 저장하지 못했습니다.')
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-start justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Todo</CardTitle>
        </CardHeader>
        <CardContent>
          {syncError && (
            <p className="text-xs text-destructive mb-3">{syncError}</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add a new todo..."
            />
            <Button type="submit" disabled={!inputValue.trim()}>
              Add
            </Button>
          </form>

          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                />
                <span
                  className={cn(
                    'flex-1 text-sm',
                    todo.completed
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  )}
                >
                  {todo.text}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label="Delete todo"
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>

          {todos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              No todos yet — add one above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default App
