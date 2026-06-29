// NOTE: JSON 型を使う際には必ず {tableName}__{columnName} というキーで型を定義する。

export interface JsonColumns {
  featureToggle__settings: Record<string, boolean>
  userProfile__initialQuestionnaireAnswers: { answers: { question: string; answer: string[] }[] }
}
