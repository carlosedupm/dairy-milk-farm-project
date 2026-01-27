'use client'

import { useMemo } from 'react'
import { diffLines } from 'diff'

type DiffViewerProps = {
  oldCode: string
  newCode: string
  path: string
  isNew?: boolean
}

export function DiffViewer({ oldCode, newCode, path, isNew }: DiffViewerProps) {
  const diff = useMemo(() => {
    if (isNew) {
      // Arquivo novo - mostrar apenas código novo
      return diffLines('', newCode)
    }
    return diffLines(oldCode, newCode)
  }, [oldCode, newCode, isNew])

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted p-2 font-mono text-sm border-b flex items-center justify-between">
        <span>{path}</span>
        {isNew && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            Novo arquivo
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <tbody>
            {diff.map((part, index) => {
              const lines = part.value.split('\n')
              // Remover última linha vazia se houver
              if (lines.length > 0 && lines[lines.length - 1] === '') {
                lines.pop()
              }

              return lines.map((line, lineIndex) => {
                const isAdded = part.added
                const isRemoved = part.removed
                const isUnchanged = !isAdded && !isRemoved

                let bgColor = ''
                let textColor = ''
                let prefix = ' '

                if (isAdded) {
                  bgColor = 'bg-green-50 dark:bg-green-950'
                  textColor = 'text-green-900 dark:text-green-100'
                  prefix = '+'
                } else if (isRemoved) {
                  bgColor = 'bg-red-50 dark:bg-red-950'
                  textColor = 'text-red-900 dark:text-red-100'
                  prefix = '-'
                } else {
                  bgColor = 'bg-background'
                  textColor = 'text-foreground'
                }

                return (
                  <tr key={`${index}-${lineIndex}`} className={bgColor}>
                    <td className={`px-2 py-1 text-muted-foreground border-r select-none ${isUnchanged ? '' : 'font-semibold'}`}>
                      {prefix}
                    </td>
                    <td className={`px-2 py-1 ${textColor} whitespace-pre`}>
                      {line || ' '}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
