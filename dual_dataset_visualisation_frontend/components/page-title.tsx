import React from 'react';
import {Button} from "@/components/ui/button";
import {IconHome} from "@tabler/icons-react";
import Link from "next/link";

interface PageTitleProps {
  title: string;
  children?: React.ReactNode;
}

export default function PageTitle({title, children}: PageTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="font-bold text-2xl">{title}</h1>
      <div className="flex gap-2">
        {children}
        <Button size="icon" variant="outline" asChild>
          <Link href="/">
            <IconHome/>
          </Link>
        </Button>
      </div>
    </div>
  )
}