'use client'

import Box from '@cloudscape-design/components/box'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import * as awsui from '@cloudscape-design/design-tokens'

const colorTokens: { name: string; value: string }[] = [
  {
    name: 'colorBackgroundButtonPrimaryDefault',
    value: awsui.colorBackgroundButtonPrimaryDefault,
  },
  { name: 'colorTextAccent', value: awsui.colorTextAccent },
  { name: 'colorTextStatusSuccess', value: awsui.colorTextStatusSuccess },
  { name: 'colorTextStatusWarning', value: awsui.colorTextStatusWarning },
  { name: 'colorTextStatusError', value: awsui.colorTextStatusError },
  { name: 'colorTextStatusInfo', value: awsui.colorTextStatusInfo },
  { name: 'colorBackgroundLayoutMain', value: awsui.colorBackgroundLayoutMain },
  { name: 'colorBorderDividerDefault', value: awsui.colorBorderDividerDefault },
]

const typeScale: {
  token: string
  size: string
  sample: 'h1' | 'h2' | 'h3' | 'p' | 'small'
}[] = [
  { token: 'fontSizeHeadingXl', size: awsui.fontSizeHeadingXl, sample: 'h1' },
  { token: 'fontSizeHeadingL', size: awsui.fontSizeHeadingL, sample: 'h2' },
  { token: 'fontSizeHeadingM', size: awsui.fontSizeHeadingM, sample: 'h3' },
  { token: 'fontSizeBodyM', size: awsui.fontSizeBodyM, sample: 'p' },
  { token: 'fontSizeBodyS', size: awsui.fontSizeBodyS, sample: 'small' },
]

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <SpaceBetween size="xxs">
      <div
        aria-hidden="true"
        style={{
          height: 56,
          borderRadius: awsui.borderRadiusContainer,
          backgroundColor: value,
          border: `1px solid ${awsui.colorBorderDividerDefault}`,
        }}
      />
      <Box fontSize="body-s" fontWeight="bold">
        {name}
      </Box>
      <Box variant="code" fontSize="body-s" color="text-body-secondary">
        {value}
      </Box>
    </SpaceBetween>
  )
}

export function FoundationsSection() {
  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Cloudscape exposes its visual decisions as design tokens. Use the token, never the raw value."
        >
          Foundation
        </Header>
      }
    >
      <SpaceBetween size="xl">
        <div>
          <Box variant="h3" padding={{ bottom: 's' }}>
            Color tokens
          </Box>
          <ColumnLayout columns={4} borders="none">
            {colorTokens.map((t) => (
              <Swatch key={t.name} name={t.name} value={t.value} />
            ))}
          </ColumnLayout>
        </div>

        <div>
          <Box variant="h3" padding={{ bottom: 's' }}>
            Type scale
          </Box>
          <SpaceBetween size="s">
            {typeScale.map((t) => (
              <div
                key={t.token}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: awsui.spaceScaledL,
                  borderBottom: `1px solid ${awsui.colorBorderDividerSecondary}`,
                  paddingBottom: awsui.spaceScaledXs,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Box variant={t.sample === 'small' ? 'small' : t.sample}>
                    The quick brown fox
                  </Box>
                </div>
                <Box
                  variant="code"
                  color="text-body-secondary"
                  fontSize="body-s"
                >
                  {t.token} · {t.size}
                </Box>
              </div>
            ))}
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </Container>
  )
}
