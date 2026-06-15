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
import { useT } from "@/i18n/client";
import { Info } from "lucide-react";

type QuestionInfoButtonProps = {
  title: string;
  info: string;
};

export function QuestionInfoButton({ title, info }: QuestionInfoButtonProps) {
  const t = useT();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label={t("questionnaire.info.moreInfo")}
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
          <AlertDialogCancel>{t("questionnaire.info.gotIt")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
