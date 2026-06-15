"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info } from "lucide-react";

type QuestionInfoButtonProps = {
  title: string;
  info: string;
};

export function QuestionInfoButton({ title, info }: QuestionInfoButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label="Mehr Informationen"
          >
            <Info className="size-3.5" />
          </Button>
        }
      />
      <AlertDialogContent className="max-w-md sm:max-w-md">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-left leading-relaxed">
            {info}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Verstanden</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
