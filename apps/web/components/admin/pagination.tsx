import { Button } from '../ui/button'

export const Pagination = ({
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
}: {
  totalCount: number
  pageSize: number
  currentPage: number
  onPageChange: (pageIndex: number) => void
}) => {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex items-center justify-center space-x-4 p-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        <span className="i-lucide-chevron-left h-4 w-4"></span>
      </Button>
      <span>
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        <span className="i-lucide-chevron-right h-4 w-4"></span>
      </Button>
    </div>
  )
}
