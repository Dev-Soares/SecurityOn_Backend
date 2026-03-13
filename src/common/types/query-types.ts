import { Article, Complaint, Post } from "@prisma/client"


export type PostQuery = {
    data: Post[]
    nextCursor: string | null
    hasNextPage: boolean
}

export type ComplaintQuery = {
    data: Complaint[]
    nextCursor: string | null
    hasNextPage: boolean
}

export type ArticleQuery = {
    data: Article[]
    nextCursor: string | null
    hasNextPage: boolean
}