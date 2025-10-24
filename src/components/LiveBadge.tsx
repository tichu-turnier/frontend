import { Chip } from '@mui/material'
import { FiberManualRecord } from '@mui/icons-material'

export default function LiveBadge() {
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize: '12px !important', color: '#ff1744' }} />}
      label="LIVE"
      size="small"
      sx={{
        backgroundColor: '#ffebee',
        color: '#c62828',
        fontWeight: 'bold',
        '& .MuiChip-icon': {
          animation: 'pulse 2s infinite'
        },
        '@keyframes pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.5 },
          '100%': { opacity: 1 }
        }
      }}
    />
  )
}