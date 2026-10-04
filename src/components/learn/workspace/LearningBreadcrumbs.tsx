import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb { label: string; to?: string }

export default function LearningBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <li className="min-w-0">
                {crumb.to && !last ? (
                  <Link to={crumb.to} className="hover:text-foreground transition-colors truncate">{crumb.label}</Link>
                ) : (
                  <span className={last ? "text-foreground font-medium truncate" : "truncate"} aria-current={last ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
              {!last && <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
