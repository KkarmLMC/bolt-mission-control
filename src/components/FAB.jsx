import { Plus } from '@phosphor-icons/react'

export default function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add new">
      <Plus size="1.375rem" weight="bold" />
    </button>
  )
}
