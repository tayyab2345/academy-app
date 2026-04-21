"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare, Pencil, Pin, PinOff, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommentForm } from "./comment-form"
import { CommentsThread } from "./comments-thread"
import { PostEngagementBar } from "./post-engagement-bar"
import { PostImage } from "./post-image"
import { PinnedPostBadge } from "./pinned-post-badge"

interface PostAuthor {
  id: string
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
  createdAt: string | Date
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

interface CommentAuthor {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
  role: string
}

interface Comment {
  id: string
  content: string
  isEdited: boolean
  createdAt: string | Date
  author: CommentAuthor
  replies?: Comment[]
}

interface PostViewerProps {
  post: Post
  comments: Comment[]
  currentUserId: string
  currentUserRole: string
  canManage: boolean
  editUrl?: string
  deleteRedirectUrl?: string
}

const visibilityLabels: Record<string, string> = {
  class_only: "Class Only",
  parents_only: "Parents Only",
  students_only: "Students Only",
  everyone: "Everyone",
}

export function PostViewer({
  post,
  comments,
  currentUserId,
  currentUserRole,
  canManage,
  editUrl,
  deleteRedirectUrl,
}: PostViewerProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handlePinToggle = async () => {
    setIsPinning(true)

    try {
      const endpoint = post.isPinned ? "unpin" : "pin"
      const response = await fetch(`/api/posts/${post.id}/${endpoint}`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to update pin state")
      }

      router.refresh()
    } catch (error) {
      console.error("Failed to toggle pin:", error)
    } finally {
      setIsPinning(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete announcement")
      }

      if (deleteRedirectUrl) {
        router.push(deleteRedirectUrl)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete post:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <CardTitle className="text-xl">{post.title}</CardTitle>
                {post.isPinned && <PinnedPostBadge />}
              </div>
              <CardDescription className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    firstName={post.author.firstName}
                    lastName={post.author.lastName}
                    avatarUrl={post.author.avatarUrl}
                    className="h-6 w-6"
                    fallbackClassName="text-xs"
                  />
                  <span>
                    {post.author.firstName} {post.author.lastName}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {post.author.role}
                    </Badge>
                  </span>
                </div>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                {post.class && (
                  <>
                    <span>•</span>
                    <span>
                      {post.class.course.code}: {post.class.name}
                    </span>
                  </>
                )}
                <span>•</span>
                <Badge variant="secondary">{visibilityLabels[post.visibility]}</Badge>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {post._count.comments} comment
                  {post._count.comments !== 1 ? "s" : ""}
                </span>
              </CardDescription>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePinToggle}
                  disabled={isPinning}
                >
                  {post.isPinned ? (
                    <PinOff className="mr-1 h-4 w-4" />
                  ) : (
                    <Pin className="mr-1 h-4 w-4" />
                  )}
                  {post.isPinned ? "Unpin" : "Pin"}
                </Button>
                {editUrl && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={editUrl}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4 text-destructive" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>

            {post.imageUrl ? (
              <PostImage
                imageUrl={post.imageUrl}
                alt={post.title}
                imageClassName="max-h-[32rem]"
              />
            ) : null}

            <PostEngagementBar
              postId={post.id}
              commentsCount={post._count.comments}
              likesCount={post._count.reactions}
              viewsCount={post._count.views}
              likedByCurrentUser={post.likedByCurrentUser}
              commentsHref="#comments"
              trackView={!post.viewedByCurrentUser}
            />
          </div>
        </CardContent>
      </Card>

      <Card id="comments">
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {post.allowComments && (
            <CommentForm
              postId={post.id}
              onSuccess={() => {
                router.refresh()
              }}
            />
          )}
          <CommentsThread
            postId={post.id}
            comments={comments}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            allowComments={post.allowComments}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement and all its comments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
