import { Plus } from '@phosphor-icons/react'

export default function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add new">
      <Plus size={22} weight="bold" />
    </button>
  )
}
