import styled from "@emotion/styled";
import Linkify from "linkify-react";
import { useEffect } from "react";
import { outputP3ColorFromRGB } from "../../../helpers/colors";
import { undoFixedWidthText } from "../../../helpers/weather";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import Loading from "../../../shared/Loading";
import { setDiscussionViewed } from "../../weather/weatherSlice";
import * as storage from "../../user/storage";
import { Opts } from "linkifyjs";

export const linkifyOptions: Opts = {
  nl2br: true,
  rel: "noopener noreferrer",
  target: "_blank",
  defaultProtocol: "https",
  ignoreTags: ["a"],
  validate: (value) => value.toLowerCase().indexOf("ppg.report") === -1,
};

const Overflow = styled.div`
  overflow: hidden;
  padding: 3rem 0;
  text-align: center;
`;

const StyledLinkify = styled(Linkify)`
  font-family: inherit;
  white-space: pre-line;
  overflow-wrap: break-word;
  margin: 0 1rem;
  line-height: 1.5;
`;

export default function Discussion() {
  const discussion = useAppSelector((state) => state.weather.discussion);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!discussion || typeof discussion !== "object") return;

    dispatch(setDiscussionViewed(discussion.issuanceTime));
    storage.setDiscussionViewed(
      discussion.issuingOffice,
      discussion.issuanceTime
    );
  }, [dispatch, discussion]);

  switch (discussion) {
    case undefined:
    case "failed":
      return <Overflow>Discussion failed to load. Try again later.</Overflow>;
    case "not-available":
      return (
        <Overflow>
          Discussion not currently available. Try again later.
        </Overflow>
      );
    case "pending":
      return (
        <Overflow>
          <Loading center={false} />
        </Overflow>
      );
    default:
      return (
        <>
          {parseDiscussion(
            undoFixedWidthText(discussion.productText.trim())
          ).map((part, index) => {
            switch (typeof part) {
              case "string":
                return (
                  <StyledLinkify
                    key={index}
                    options={linkifyOptions}
                    tagName="div"
                  >
                    {part.trim()}
                  </StyledLinkify>
                );
              default:
                return (
                  <DiscussionPartContainer
                    header={part.header}
                    key={index}
                    issuingOffice={discussion.issuingOffice.slice(1)}
                  >
                    {part.body}
                  </DiscussionPartContainer>
                );
            }
          })}
        </>
      );
  }
}

interface DiscussionPart {
  header: string;
  body: string;
}

const headerRegex = /(\n\.(?:[^\n.])+\.{3})/;

function parseDiscussion(discussion: string): (string | DiscussionPart)[] {
  const splits = discussion.split(headerRegex);

  const result: (string | DiscussionPart)[] = [];

  while (splits.length) {
    const potentialHeader = splits.shift();

    if (!potentialHeader) continue;

    if (headerRegex.test(potentialHeader)) {
      const body = splits.shift();
      if (!body) continue;
      result.push({
        header: potentialHeader.trim().slice(1, -3),
        body: body.trim().replace(/&&$/, "").trim(),
      });
    } else {
      // It's a section without a header instead
      result.push(potentialHeader);
    }
  }

  return result;
}

interface DiscussionPartContainerProps {
  header: string;
  children: React.ReactNode;
  issuingOffice: string;
}

function DiscussionPartContainer({
  header,
  children,
  issuingOffice,
}: DiscussionPartContainerProps) {
  const lowercaseHeader = header
    .toLowerCase()
    .replace(issuingOffice.toLowerCase(), issuingOffice.toUpperCase())
    .replace(/(^|\s|\/)([a-z])/g, function (m, p1, p2) {
      return p1 + p2.toUpperCase();
    });

  return (
    <div>
      <Header>{lowercaseHeader}</Header>
      <StyledLinkify tagName="div" options={linkifyOptions}>
        {children}
      </StyledLinkify>
    </div>
  );
}

const H2 = styled.h2<{ textColor: [number, number, number] }>`
  position: sticky;
  top: 0;
  background: #111317;
  font-size: 1.1em;
  font-weight: 800;
  margin: 0;
  padding: 1rem 1rem 0;
  margin-top: 0.5rem;

  ${({ textColor }) => outputP3ColorFromRGB(textColor)};

  aside {
    display: inline;
    font-size: 0.75em;
    font-weight: normal;
    text-transform: capitalize;
  }

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.04;
    background: linear-gradient(
      180deg,
      transparent,
      transparent,
      ${({ textColor }) =>
        `rgb(${textColor[0]},${textColor[1]},${textColor[2]})`}
    );
  }

  &:after {
    content: "";
    display: block;
    margin-top: 1rem;
    margin: 0.5rem -1rem 1rem;
    height: 1px;
    background: currentColor;
    opacity: 0.2;
  }
`;

interface HeaderProps {
  children: string;
}

// Matches "Near Term /Through Tonight/"
// or "Near Term [Through Tonight]"
// or "Near Term (Through Tonight)"
const asideRegex = /(\/|\[|\().*(\/|\]|\))$/;

function Header({ children }: HeaderProps) {
  const color = (() => {
    switch (children.toUpperCase().trim().replace(asideRegex, "").trim()) {
      case "FIRE":
      case "FIRE WEATHER":
        return [255, 0, 0];
      case "SHORT TERM":
      case "NEAR TERM":
        return [255, 255, 0];
      case "LONG TERM":
        return [255, 215, 0];
      case "AVIATION":
        return [0, 187, 255];
      case "MARINE":
        return [0, 0, 255];
      case "UPDATE":
      case "OUTLOOK":
      case "OVERVIEW":
      case "SYNOPSIS":
        return [0, 255, 0];
      case "DISCUSSION":
        return [255, 100, 300];

      default:
        return [255, 255, 255];
    }
  })();

  const mainText = children.trim().replace(asideRegex, "").trim();
  const asideText = children
    .trim()
    .match(asideRegex)?.[0]
    ?.trim()
    ?.slice(1, -1)
    .toLocaleLowerCase();
  return (
    <H2 textColor={color as [number, number, number]}>
      {mainText} {asideText && <aside>({asideText})</aside>}
    </H2>
  );
}
