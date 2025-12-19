import React from 'react'
import type { PageButton } from '../../types/project'

type PageButtonProps = {
  button: PageButton
  imageUrl?: string
  onClick: () => void
  isVisible: boolean
}

const PageButtonComponent: React.FC<PageButtonProps> = ({
  button,
  imageUrl,
  onClick,
  isVisible,
}) => {
  if (!isVisible) return null

  return (
    <button
      onClick={onClick}
      className='absolute cursor-pointer'
      style={{
        left: `${button.position.x}%`,
        top: `${button.position.y}%`,
        width: `${button.size.width}%`,
        height: `${button.size.height}%`,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: !imageUrl ? 'rgba(59, 130, 246, 0.7)' : 'transparent',
        border: 'none',
        outline: 'none',
      }}
      aria-label='Navigation button'
    />
  )
}

export default PageButtonComponent
