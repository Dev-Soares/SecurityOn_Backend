import { Complaint, Post } from "prisma/prisma/client"


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