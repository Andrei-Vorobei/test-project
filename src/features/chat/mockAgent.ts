import type { ChatMessage } from './chatTypes'

export type AgentEvent =
  | { type: 'started' }
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool: string }
  | { type: 'tool_result'; tool: string; result: string }
  | { type: 'text_delta'; text: string }
  | { type: 'completed' }
  | { type: 'error'; message: string }

export interface AgentRequest {
  prompt: string
  history: ChatMessage[]
}

const PROCESSING_DELAY_MS = 420
const STREAM_DELAY_MS = 32

function wait(delay: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }

  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, delay)

    function handleAbort() {
      clearTimeout(timerId)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function getPreviousAssistantMessage(history: ChatMessage[]) {
  return [...history]
    .reverse()
    .find((message) => message.role === 'assistant' && message.status === 'complete')
}

function createReply({ prompt, history }: AgentRequest): string {
  const previousReply = getPreviousAssistantMessage(history)

  if (
    previousReply &&
    /(проще|попроще|короче|по-другому|другими словами)/i.test(prompt)
  ) {
    if (/закон ома/i.test(previousReply.content)) {
      return 'Если совсем просто: напряжение как будто «толкает» электрический ток, а сопротивление мешает ему течь. Больше напряжение — сильнее ток; больше сопротивление — слабее ток.'
    }

    return `Конечно, объясню проще. Главная мысль предыдущего ответа: ${previousReply.content}`
  }

  if (/закон ома/i.test(prompt)) {
    return 'Закон Ома описывает связь между напряжением, током и сопротивлением: I = U / R. Представь воду в трубе: напряжение «толкает» ток, а сопротивление мешает ему течь. При большем напряжении ток сильнее, а при большем сопротивлении — слабее.'
  }

  if (/втор(?:ой|ого)\s+закон ньютона|второй закон ньютона/i.test(prompt)) {
    return 'Второй закон Ньютона говорит: чем сильнее толкнуть предмет, тем быстрее меняется его движение. Тяжёлый предмет разогнать труднее, чем лёгкий. Формула: F = m × a, где сила равна массе, умноженной на ускорение.'
  }

  if (/реш(?:и|ать|ение).{0,30}задач|не давай ответ|с подсказк/i.test(prompt)) {
    return 'Давай разберёмся вместе, шаг за шагом. Сначала определим, что известно и что нужно найти. Пришли условие задачи — начнём с первой подсказки, не перескакивая сразу к ответу.'
  }

  return `Давай разберёмся вместе. ${prompt} — хорошая тема для изучения. Скажи, что именно кажется самым сложным, и я объясню это по шагам и простыми словами.`
}

function calculate(prompt: string): { expression: string; result: number } | null {
  const match = prompt.match(
    /(-?\d+(?:[.,]\d+)?)\s*([+*×x/÷-])\s*(-?\d+(?:[.,]\d+)?)/i,
  )

  if (!match) {
    return null
  }

  const left = Number(match[1].replace(',', '.'))
  const right = Number(match[3].replace(',', '.'))
  const operator = match[2].toLowerCase()

  let result: number
  switch (operator) {
    case '+':
      result = left + right
      break
    case '-':
      result = left - right
      break
    case '*':
    case '×':
    case 'x':
      result = left * right
      break
    case '/':
    case '÷':
      result = left / right
      break
    default:
      return null
  }

  if (!Number.isFinite(result)) {
    return null
  }

  return { expression: match[0].trim(), result }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

async function* streamText(
  text: string,
  signal: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const chunks = text.match(/\S+\s*|\s+/g) ?? [text]

  for (const chunk of chunks) {
    await wait(STREAM_DELAY_MS, signal)
    yield { type: 'text_delta', text: chunk }
  }
}

export async function* streamAgentReply(
  request: AgentRequest,
  signal: AbortSignal,
): AsyncGenerator<AgentEvent> {
  yield { type: 'started' }
  await wait(PROCESSING_DELAY_MS, signal)

  if (/(вызови ошибку|смоделируй ошибку|ошибка агента)/i.test(request.prompt)) {
    yield {
      type: 'error',
      message: 'Не удалось подготовить ответ. Попробуй отправить запрос ещё раз.',
    }
    return
  }

  const calculation = calculate(request.prompt)
  let reply: string

  if (calculation) {
    yield { type: 'status', message: 'Использую калькулятор' }
    await wait(240, signal)
    yield { type: 'tool_call', tool: 'Калькулятор' }
    await wait(180, signal)
    yield {
      type: 'tool_result',
      tool: 'Калькулятор',
      result: `${calculation.expression} = ${formatNumber(calculation.result)}`,
    }
    yield { type: 'status', message: 'Готовлю объяснение' }
    reply = `Посчитаем по шагам: ${calculation.expression} = ${formatNumber(calculation.result)}. Ответ: ${formatNumber(calculation.result)}.`
  } else {
    yield { type: 'status', message: 'Готовлю объяснение' }
    reply = createReply(request)
  }

  for await (const event of streamText(reply, signal)) {
    yield event
  }

  yield { type: 'completed' }
}
