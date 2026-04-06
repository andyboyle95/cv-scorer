"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, X, Upload, FileWarning, FlaskConical } from "lucide-react";
import { Button } from "@/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { UploadedFile } from "@/lib/types";
import { EXAMPLE_CVS } from "@/lib/example-cvs";

interface CvUploadZoneProps {
  files: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemoved: (id: string) => void;
  onStartScoring: () => void;
  disabled?: boolean;
}

export function CvUploadZone({
  files,
  onFilesAdded,
  onFileRemoved,
  onStartScoring,
  disabled,
}: CvUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { file: File; errors: readonly { message: string }[] }[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: "pending" as const,
      }));

      if (rejectedFiles.length > 0) {
        const rejectedNames = rejectedFiles
          .map((r) => r.file.name)
          .join(", ");
        alert(
          `Rejected files (wrong type or too large): ${rejectedNames}\n\nOnly PDF and DOCX files under 10MB are accepted.`
        );
      }

      if (newFiles.length > 0) {
        onFilesAdded(newFiles);
      }
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/rtf": [".rtf"],
      "text/rtf": [".rtf"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 50,
    disabled,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1a3668]">Upload CVs</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 border-dashed border-[#1a3668] text-[#1a3668] hover:bg-blue-50"
          onClick={() => {
            const examples: UploadedFile[] = EXAMPLE_CVS.map((cv) => ({
              id: `example-${cv.name}-${Math.random()}`,
              name: cv.name,
              size: cv.text.length,
              type: "text/plain",
              file: new File([cv.text], cv.name, { type: "text/plain" }),
              status: "pending" as const,
              extractedText: cv.text,
            }));
            onFilesAdded(examples);
          }}
        >
          <FlaskConical className="h-4 w-4" />
          Load 20 Example CVs
        </Button>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-[#df2681] bg-pink-50"
            : "border-[#E2E8F0] hover:border-[#1a3668] hover:bg-blue-50/40"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mx-auto h-10 w-10 mb-3 ${
            isDragActive ? "text-[#df2681]" : "text-[#1a3668]"
          }`}
        />
        <p className="text-base font-medium text-[#2D2D2D]">
          {isDragActive
            ? "Drop CVs here..."
            : "Drag & drop CVs here, or click to browse"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          PDF, DOCX, DOC, RTF or TXT · Up to 10MB each · Maximum 50 CVs
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#1a3668]">
              {files.length} file{files.length !== 1 ? "s" : ""} ready
            </h3>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => files.forEach((f) => onFileRemoved(f.id))}
              >
                Remove all
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50"
              >
                {file.name.endsWith(".pdf") ? (
                  <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2D2D2D] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {file.status === "error" && (
                  <FileWarning className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                {!disabled && file.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onFileRemoved(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <Button
          onClick={onStartScoring}
          disabled={disabled || files.length === 0}
          size="lg"
          className="w-full text-base font-semibold"
        >
          Score {files.length} CV{files.length !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
