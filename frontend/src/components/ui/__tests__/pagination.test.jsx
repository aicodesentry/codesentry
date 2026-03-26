import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Pagination } from '../pagination'

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders page info and buttons', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('calls onPageChange with correct page on click', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with prev page on Previous click', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText('Previous page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with next page on Next click', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('shows ellipsis for large page counts', () => {
    render(<Pagination currentPage={5} totalPages={20} onPageChange={() => {}} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })

  it('highlights the current page', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />)
    const page3 = screen.getByText('3')
    expect(page3.className).toContain('bg-slate-900')
  })
})
