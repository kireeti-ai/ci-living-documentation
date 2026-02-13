type TempleLogoProps = {
  className?: string
}

const TempleLogo = ({ className }: TempleLogoProps) => {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" className={className}>
      <path d="M32 5.2c1.2 0 2.2 1 2.2 2.2S33.2 9.6 32 9.6s-2.2-1-2.2-2.2S30.8 5.2 32 5.2Z" fill="currentColor" />
      <path d="M28.8 10h6.4c-.2 1.4-.9 2.5-1.9 3.2h-2.6c-1-.7-1.7-1.8-1.9-3.2Z" fill="currentColor" />
      <path d="M25.3 15.6h13.4a8.2 8.2 0 0 1 2.2 5.6H23.1a8.2 8.2 0 0 1 2.2-5.6Z" fill="currentColor" />
      <path d="M21.2 22.5h21.6c4.4 0 8 3.6 8 8v.6H13.2v-.6c0-4.4 3.6-8 8-8Z" fill="currentColor" />
      <path d="M11.8 32.5h40.4v4.2H11.8zM10.4 37.8h43.2v4H10.4zM9.2 42.8h45.6v5H9.2z" fill="currentColor" />
      <path d="M7.8 49h48.4v9.8H7.8z" fill="currentColor" />
      <path d="M12.6 55.8h3.1v2.1h-3.1zM48.3 55.8h3.1v2.1h-3.1z" fill="currentColor" />
      <path d="M20.2 26.1h4.2v4h-4.2zM29.9 26.1h4.2v4h-4.2zM39.6 26.1h4.2v4h-4.2z" fill="#0d1117" opacity=".4" />
    </svg>
  )
}

export default TempleLogo
