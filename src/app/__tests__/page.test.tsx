import { render, screen } from '@testing-library/react'
import Page from '../page'

describe('Home Page', () => {
  it('renders the Udaman logo', () => {
    render(<Page />)
    const logo = screen.getByAltText('Udaman Logo')
    expect(logo).toBeInTheDocument()
  })

  it('renders the YouTube video', () => {
    render(<Page />)
    const video = screen.getByTitle('Udaman Competition Video')
    expect(video).toBeInTheDocument()
  })

  it('has correct YouTube video source', () => {
    render(<Page />)
    const video = screen.getByTitle('Udaman Competition Video')
    expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/s4rwIfk4fGw')
  })
}) 