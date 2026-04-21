"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CommentForm } from "./comment-form"

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

interface CommentsThreadProps {
  postId: string
  comments: Comment[]
  currentUserId: string
  currentUserRole: string
  allowComments: boolean
}

export function CommentsThread({
  postId,
  comments,
  currentUserId,
  currentUserRole,
  allowComments,
}: CommentsThreadProps) {
  const router = useRouter()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const canModifyComment = (comment: Comment) =>
    currentUserId === comment.author.id || currentUserRole === "admin"

  const handleDelete = async () => {
    if (!deletingId) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/comments/${deletingId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete comment:", error)
    } finally {
      setIsLoading(false)
      setDeletingId(null)
    }
  }

  const renderComment = (comment: Comment, isReply = false): React.ReactNode => {
    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={cn("space-y-3", isReply && "ml-12 mt-3")}
      >
        <div className="flex items-start gap-3">
          <UserAvatar
            firstName={comment.author.firstName}
            lastName={comment.author.lastName}
            avatarUrl={comment.author.avatarUrl}
            className="h-8 w-8"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {comment.author.role}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {editingComment?.id === comment.id ? (
              <div className="mt-2">
                <CommentForm
                  postId={postId}
                  initialContent={comment.content}
                  onCancel={() => setEditingComment(null)}
                  onSuccess={() => {
                    setEditingComment(null)
                    router.refresh()
                  }}
                  isEditing
                  commentId={comment.id}
                />
              </div>
            ) : (
              <p className="mt-1 text-sm">{comment.content}</p>
            )}

            <div className="mt-2 flex items-center gap-3">
              {allowComments && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setReplyingTo(
                      replyingTo === comment.id ? null : comment.id
                    )
                  }
                >
                  <Reply className="mr-1 h-3 w-3" />
                  Reply
                </Button>
              )}

              {canModifyComment(comment) && editingComment?.id !== comment.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setEditingComment(comment)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingId(comment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3">
                <CommentForm
                  postId={postId}
                  parentCommentId={comment.id}
                  onCancel={() => setReplyingTo(null)}
                  onSuccess={() => {
                    setReplyingTo(null)
                    router.refresh()
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {(comment.replies?.length || 0) > 0 && (
          <div className="space-y-3">
            {comment.replies?.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No comments yet
            </p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>

      <AlertDialog open={Boolean(deletingId)} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment and all its replies will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
