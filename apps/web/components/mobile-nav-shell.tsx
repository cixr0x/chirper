"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type MobileNavShellProps = {
  children: ReactNode;
};

type SidebarElement = ReactElement<HTMLAttributes<HTMLElement>>;

export function MobileNavShell({ children }: MobileNavShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebar = Children.only(children);
  const closeNavigation = () => setIsOpen(false);
  const handleSidebarClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest("a")) {
      closeNavigation();
    }
  };
  const sidebarElement = isValidElement(sidebar) ? (sidebar as SidebarElement) : null;

  return (
    <>
      <button
        aria-controls="mobile-primary-nav"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        className="mobile-nav-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {isOpen ? (
        <button
          aria-label="Close navigation"
          className="mobile-nav-backdrop"
          onClick={closeNavigation}
          type="button"
        />
      ) : null}

      {sidebarElement
        ? cloneElement(sidebarElement, {
            id: "mobile-primary-nav",
            className: `${sidebarElement.props.className ?? ""} ${isOpen ? "social-sidebar-open" : ""}`.trim(),
            onClickCapture: handleSidebarClick,
            onSubmitCapture: closeNavigation,
          })
        : sidebar}
    </>
  );
}
