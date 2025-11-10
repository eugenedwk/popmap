import PropTypes from 'prop-types'

function EventCard({ event, onClick, isSelected }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
      `}
    >
      <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
      <p className="text-sm text-gray-600 mb-2">{event.business_name}</p>

      <div className="text-sm text-gray-700 space-y-1">
        <div className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>
            {formatDate(event.start_datetime)} - {formatDate(event.end_datetime)}
          </span>
        </div>

        <div className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {formatTime(event.start_datetime)}
          </span>
        </div>
      </div>
    </div>
  )
}

EventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    business_name: PropTypes.string.isRequired,
    start_datetime: PropTypes.string.isRequired,
    end_datetime: PropTypes.string.isRequired,
    latitude: PropTypes.string.isRequired,
    longitude: PropTypes.string.isRequired,
  }).isRequired,
  onClick: PropTypes.func,
  isSelected: PropTypes.bool,
}

EventCard.defaultProps = {
  onClick: () => {},
  isSelected: false,
}

export default EventCard
