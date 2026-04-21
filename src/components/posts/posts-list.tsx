"use client"

import Link from "next/link"
import { Calendar, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { PostEngagementBar } from "./post-engagement-bar"
import { UserAvatar } from "@/components/ui/user-avatar"
import { PostImage } from "./post-image"
import { PinnedPostBadge } from "./pinned-post-badge"

interface PostAuthor {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  role: string
}

interface PostClass {
  name: string
  course: {
    code: string
    name: string
  }
}

interface Post {
  id: string
  title: string
  content: string
  imageUrl: string | null
  isPinned: boolean
  allowComments: boolean
  visibility: string
  createdAt: string
  author: PostAuthor
  class: PostClass | null
  likedByCurrentUser: boolean
  viewedByCurrentUser: boolean
  _count: {
    comments: number
    reactions: number
    views: number
  }
}

interface PostsListProps {
  posts: Post[]
  baseUrl: string
  emptyMessage?: string
  showClass?: boolean
}

export function PostsList({
  posts,
  baseUrl,
  emptyMessage = "No announcements yet",
  showClass = true,
}: PostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className={cn(
            "rounded-lg border p-6 transition-shadow hover:shadow-md",
            post.isPinned && "border-primary/30 bg-primary/5"
          )}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <Link
                    href={`${baseUrl}/${post.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {post.title}
                  </Link>
                  {post.isPinned && <PinnedPostBadge />}
                </div>
                <p className="line-clamp-2 text-muted-foreground">
                  {post.content}
                </p>
              </div>
            </div>

            {post.imageUrl ? (
              <PostImage
                imageUrl={post.imageUrl}
                alt={post.title}
                className="max-w-full"
                imageClassName="max-h-80"
              />
            ) : null}

            <PostEngagementBar
              postId={post.id}
              commentsCount={post._count.comments}
              likesCount={post._count.reactions}
              viewsCount={post._count.views}
              likedByCurrentUser={post.likedByCurrentUser}
              commentsHref={`${baseUrl}/${post.id}`}
            />

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <UserAvatar
                  firstName={post.author.firstName}
                  lastName={post.author.lastName}
                  avatarUrl={post.author.avatarUrl}
                  className="h-5 w-5"
                  fallbackClassName="text-[10px]"
                  iconClassName="h-3 w-3"
                />
                <span>
                  {post.author.firstName} {post.author.lastName}
                  <span className="ml-1 text-xs">({post.author.role})</span>
                </span>
              </div>

              {showClass && post.class && (
                <div className="flex items-center gap-1">
                  <span>
                    {post.class.course.code}: {post.class.name}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
