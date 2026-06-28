'use client'

import { useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import RadioGroup from '@cloudscape-design/components/radio-group'
import Select, { SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Textarea from '@cloudscape-design/components/textarea'
import Toggle from '@cloudscape-design/components/toggle'

const INSTANCE_TYPES: SelectProps.Option[] = [
  { label: 't3.micro', value: 't3.micro', description: '2 vCPU · 1 GiB' },
  { label: 'm6i.large', value: 'm6i.large', description: '2 vCPU · 8 GiB' },
  { label: 'c6g.xlarge', value: 'c6g.xlarge', description: '4 vCPU · 8 GiB' },
  {
    label: 'r6i.2xlarge',
    value: 'r6i.2xlarge',
    description: '8 vCPU · 64 GiB',
  },
]

export function CreateResourceForm() {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [instanceType, setInstanceType] = useState<SelectProps.Option>(
    INSTANCE_TYPES[1],
  )
  const [environment, setEnvironment] = useState('production')
  const [description, setDescription] = useState('')
  const [monitoring, setMonitoring] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!name.trim()) {
      setNameError('Enter a name for the instance.')
      return
    }
    setNameError('')
    setSubmitted(true)
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <Form
        header={
          <Header
            variant="h2"
            description="A realistic form composed from Cloudscape form primitives."
          >
            Launch instance
          </Header>
        }
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link">Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>
              Launch
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {submitted && (
            <Alert
              type="success"
              dismissible
              onDismiss={() => setSubmitted(false)}
              header="Instance launching"
            >
              {`"${name}" (${instanceType.value}) is being launched in the ${environment} environment.`}
            </Alert>
          )}

          <Container header={<Header variant="h3">Configuration</Header>}>
            <SpaceBetween size="l">
              <FormField
                label="Instance name"
                description="A friendly name to identify this instance."
                errorText={nameError}
              >
                <Input
                  value={name}
                  placeholder="e.g. web-prod-3"
                  onChange={({ detail }) => setName(detail.value)}
                />
              </FormField>

              <FormField
                label="Instance type"
                description="Choose the compute, memory, and network capacity."
              >
                <Select
                  selectedOption={instanceType}
                  options={INSTANCE_TYPES}
                  onChange={({ detail }) =>
                    setInstanceType(detail.selectedOption)
                  }
                />
              </FormField>

              <FormField label="Environment">
                <RadioGroup
                  value={environment}
                  onChange={({ detail }) => setEnvironment(detail.value)}
                  items={[
                    { value: 'production', label: 'Production' },
                    { value: 'staging', label: 'Staging' },
                    { value: 'development', label: 'Development' },
                  ]}
                />
              </FormField>

              <FormField
                label="Description"
                description="Optional notes about this instance."
              >
                <Textarea
                  value={description}
                  placeholder="What is this instance for?"
                  onChange={({ detail }) => setDescription(detail.value)}
                />
              </FormField>

              <FormField label="Detailed monitoring">
                <Toggle
                  checked={monitoring}
                  onChange={({ detail }) => setMonitoring(detail.checked)}
                >
                  Enable enhanced CloudWatch metrics
                </Toggle>
              </FormField>
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      </Form>
    </form>
  )
}
