"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Upload } from "lucide-react"
import { ResultFileType } from "@prisma/client"
import {
  ExamDetailFileItem,
  ExamDetailStudentRow,
} from "@/lib/results/result-data"
import {
  calculateGrade,
  calculatePercentage,
  resultFileTypeLabels,
} from "@/lib/results/result-utils"
import { ExamSummaryCards } from "@/components/results/exam-summary-cards"
import { ResultFilesPanel } from "@/components/results/result-files-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface ExamDetailManagerProps {
  examId: string
  totalMarks: number
  students: ExamDetailStudentRow[]
  resultFiles: ExamDetailFileItem[]
  summary: {
    studentCount: number
    enteredCount: number
    averagePercentage: number | null
    topPercentage: number | null
  }
}

type EditableRow = {
  studentProfileId: string
  obtainedMarksInput: string
  remarks: string
}

const resultFileTypes = Object.values(ResultFileType)

export function ExamDetailManager({
  examId,
  totalMarks,
  students,
  resultFiles,
  summary,
}: ExamDetailManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<EditableRow[]>([])
  const [isSavingMarks, setIsSavingMarks] = useState(false)
  const [marksError, setMarksError] = useState<string | null>(null)
  const [marksSuccess, setMarksSuccess] = useState<string | null>(null)

  const [selectedFileType, setSelectedFileType] = useState<ResultFileType>(
    ResultFileType.marksheet
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all")
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  useEffect(() => {
    setRows(
      students.map((student) => ({
        studentProfileId: student.studentProfile.id,
        obtainedMarksInput:
          student.result?.obtainedMarks !== undefined && student.result?.obtainedMarks !== null
            ? String(student.result.obtainedMarks)
            : "",
        remarks: student.result?.remarks || "",
      }))
    )
  }, [students])

  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        id: student.studentProfile.id,
        label: `${student.studentProfile.user.firstName} ${student.studentProfile.user.lastName} (${student.studentProfile.studentId})`,
      })),
    [students]
  )

  async function handleSaveMarks() {
    setIsSavingMarks(true)
    setMarksError(null)
    setMarksSuccess(null)

    try {
      const entries = rows.map((row) => {
        const trimmedMarks = row.obtainedMarksInput.trim()
        const obtainedMarks = trimmedMarks === "" ? null : Number(trimmedMarks)

        return {
          studentProfileId: row.studentProfileId,
          obtainedMarks:
            obtainedMarks === null || Number.isNaN(obtainedMarks)
              ? null
              : obtainedMarks,
          remarks: row.remarks.trim() || null,
        }
      })

      const response = await fetch(`/api/results/${examId}/marks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save marks")
      }

      setMarksSuccess("Marks saved successfully.")
      router.refresh()
    } catch (error) {
      setMarksError(error instanceof Error ? error.message : "Failed to save marks")
    } finally {
      setIsSavingMarks(false)
    }
  }

  async function handleUploadFile() {
    if (!fileToUpload) {
      setFileError("Choose a PDF or image to upload.")
      return
    }

    setIsUploadingFile(true)
    setFileError(null)

    try {
      const target = fileToUpload.type === "application/pdf" ? "result_pdf" : "result_image"
      const uploadFormData = new FormData()
      uploadFormData.append("file", fileToUpload)
      uploadFormData.append("target", target)

      const uploadResponse = await fetch("/api/uploads/result-files", {
        method: "POST",
        body: uploadFormData,
      })
      const uploadData = await uploadResponse.json().catch(() => null)

      if (!uploadResponse.ok) {
        throw new Error(uploadData?.error || "Failed to upload result file")
      }

      const attachResponse = await fetch(`/api/results/${examId}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: uploadData.fileUrl,
          fileType: selectedFileType,
          mimeType: uploadData.mimeType,
          studentProfileId: selectedStudentId === "all" ? null : selectedStudentId,
        }),
      })
      const attachData = await attachResponse.json().catch(() => null)

      if (!attachResponse.ok) {
        throw new Error(attachData?.error || "Failed to attach result file")
      }

      setFileToUpload(null)
      const fileInput = document.getElementById("result-file-upload") as HTMLInputElement | null
      if (fileInput) {
        fileInput.value = ""
      }
      router.refresh()
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to upload result file"
      )
    } finally {
      setIsUploadingFile(false)
    }
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId)
    setFileError(null)

    try {
      const response = await fetch(`/api/results/${examId}/files/${fileId}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove result file")
      }

      router.refresh()
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to remove result file"
      )
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <div className="space-y-6">
      <ExamSummaryCards
        studentCount={summary.studentCount}
        enteredCount={summary.enteredCount}
        averagePercentage={summary.averagePercentage}
        topPercentage={summary.topPercentage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Enter Marks</CardTitle>
          <CardDescription>
            Enter obtained marks for each enrolled student. Percentages and grades are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 pr-4 font-medium">Student</th>
                  <th className="py-3 pr-4 font-medium">Student ID</th>
                  <th className="py-3 pr-4 font-medium">Obtained Marks</th>
                  <th className="py-3 pr-4 font-medium">Percentage</th>
                  <th className="py-3 pr-4 font-medium">Grade</th>
                  <th className="py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const row = rows[index]
                  const numericMarks =
                    row && row.obtainedMarksInput.trim() !== ""
                      ? Number(row.obtainedMarksInput)
                      : null
                  const percentage =
                    numericMarks !== null && !Number.isNaN(numericMarks)
                      ? calculatePercentage(numericMarks, totalMarks)
                      : null
                  const grade =
                    percentage !== null ? calculateGrade(percentage) : "-"

                  return (
                    <tr key={student.studentProfile.id} className="border-b align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium">
                          {student.studentProfile.user.firstName}{" "}
                          {student.studentProfile.user.lastName}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {student.studentProfile.studentId}
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row?.obtainedMarksInput || ""}
                          onChange={(event) =>
                            setRows((currentRows) =>
                              currentRows.map((currentRow, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...currentRow,
                                      obtainedMarksInput: event.target.value,
                                    }
                                  : currentRow
                              )
                            )
                          }
                          placeholder={`Out of ${totalMarks}`}
                        />
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {percentage !== null ? `${percentage.toFixed(2)}%` : "-"}
                      </td>
                      <td className="py-3 pr-4">{grade}</td>
                      <td className="py-3">
                        <Textarea
                          value={row?.remarks || ""}
                          onChange={(event) =>
                            setRows((currentRows) =>
                              currentRows.map((currentRow, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...currentRow,
                                      remarks: event.target.value,
                                    }
                                  : currentRow
                              )
                            )
                          }
                          placeholder="Optional remark"
                          className="min-h-[44px]"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {marksError ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {marksError}
            </div>
          ) : null}

          {marksSuccess ? (
            <div className="rounded-md bg-green-100 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
              {marksSuccess}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveMarks} disabled={isSavingMarks}>
              {isSavingMarks ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Marks
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Result File</CardTitle>
          <CardDescription>
            Upload a PDF marksheet or scanned result image for the whole class or an individual student.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Result Type</label>
              <Select
                value={selectedFileType}
                onValueChange={(value) => setSelectedFileType(value as ResultFileType)}
                disabled={isUploadingFile}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {resultFileTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {resultFileTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Attach To</label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                disabled={isUploadingFile}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Whole class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole Class</SelectItem>
                  {studentOptions.map((studentOption) => (
                    <SelectItem key={studentOption.id} value={studentOption.id}>
                      {studentOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <Input
                id="result-file-upload"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setFileToUpload(event.target.files?.[0] || null)}
                disabled={isUploadingFile}
              />
            </div>
          </div>

          {fileError ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {fileError}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={handleUploadFile} disabled={isUploadingFile}>
              {isUploadingFile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Result File
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResultFilesPanel
        files={resultFiles}
        onDelete={handleDeleteFile}
        deletingFileId={deletingFileId}
      />
    </div>
  )
}
