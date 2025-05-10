import feData from '../data/fe.json'

export interface Question {
  id: number
  company: string
  level: string
  content: string
  date: string
  rating: number
  category: string
  isFavorite: boolean
  isHidden: boolean
}

export const Questions: Question[] = feData.map((item, index) => {
  return {
    id: index + 1,
    company: item.c,
    level: item.l,
    content: item.q,
    date: item.m,
    rating: item.d,
    category: item.t,
    isFavorite: false,
    isHidden: false,
  }
})

export const categories = ["全部", ...Array.from(new Set(feData.map(item => item.t)))].filter(Boolean)

export const companies = ["全部", ...Array.from(new Set(feData.map(item => item.c)))].filter(Boolean)

export const levels = ["全部", ...Array.from(new Set(feData.map(item => item.l)))].filter(Boolean) 