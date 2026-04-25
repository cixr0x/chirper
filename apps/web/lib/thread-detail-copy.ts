export function formatParticipantHeading(count: number) {
  return `${count} ${count === 1 ? "person" : "people"} involved`;
}

export function formatThreadOverviewTimestamp(formattedTimestamp: string) {
  const lastSeparatorIndex = formattedTimestamp.lastIndexOf(", ");

  if (lastSeparatorIndex === -1) {
    return {
      date: formattedTimestamp,
      time: "",
    };
  }

  return {
    date: formattedTimestamp.slice(0, lastSeparatorIndex),
    time: formattedTimestamp.slice(lastSeparatorIndex + 2),
  };
}
