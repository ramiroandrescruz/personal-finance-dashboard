import { Button, type ButtonProps, type ElementProps } from '@mantine/core'

type AppButtonTone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'danger-outline'

interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'>, ElementProps<'button', keyof ButtonProps> {
  tone?: AppButtonTone
}

const toneStyles: Record<AppButtonTone, { variant: ButtonProps['variant']; color?: string }> = {
  primary: { variant: 'gradient' },
  secondary: { variant: 'gradient' },
  tertiary: { variant: 'default' },
  danger: { variant: 'gradient' },
  'danger-outline': { variant: 'light', color: 'red' }
}

export const AppButton = ({ tone = 'tertiary', children, ...props }: AppButtonProps) => {
  const selectedTone = toneStyles[tone]

  return (
    <Button
      {...props}
      variant={selectedTone.variant}
      color={selectedTone.color}
      radius="md"
      fw={700}
      styles={{
        root: {
          minHeight: '2.45rem',
          borderColor: 'var(--line)',
          ...(tone === 'primary' && {
            background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
            color: '#072035'
          }),
          ...(tone === 'secondary' && {
            background: 'linear-gradient(135deg, #6ee7b7, #10b981)',
            color: '#042127'
          }),
          ...(tone === 'tertiary' && {
            background: 'var(--input-bg)',
            color: 'var(--text)'
          }),
          ...(tone === 'danger' && {
            background: 'linear-gradient(135deg, #f87171, #ef4444)',
            color: '#ffffff'
          }),
          ...(tone === 'danger-outline' && {
            borderColor: 'rgba(248, 113, 113, 0.5)',
            background: 'rgba(127, 29, 29, 0.25)',
            color: '#fecaca'
          }),
          ...(props.disabled && {
            color: 'var(--muted)',
            background: 'var(--input-bg)'
          })
        },
        label: {
          color: 'inherit',
          WebkitTextFillColor: 'currentColor',
          fontWeight: 700
        }
      }}
    >
      {children}
    </Button>
  )
}
