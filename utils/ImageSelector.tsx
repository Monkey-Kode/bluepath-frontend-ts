import React from "react";
import Housing from "@/assets/housing.svg";
import Industrial from "@/assets/industrial.svg";
import School from "@/assets/school-flag.svg";
import Office from "@/assets/office.svg";
import University from "@/assets/university.svg";
import Government from "@/assets/government-flag.svg";
import Hospital from "@/assets/hospital.svg";

export const getImageComponent = (
  entity: readonly (string | null)[] | null,
) => {
  if (!entity) return <Office />;
  const sanitizeEntity = String(entity).toLowerCase().trim();
  if (sanitizeEntity.includes("residential")) {
    return <Housing />;
  } else if (
    sanitizeEntity.includes("school") ||
    sanitizeEntity.includes("education")
  ) {
    return <School />;
  } else if (
    sanitizeEntity.includes("industrial") ||
    sanitizeEntity.includes("agricultural")
  ) {
    return <Industrial />;
  } else if (sanitizeEntity.includes("university")) {
    return <University />;
  } else if (sanitizeEntity.includes("municipal")) {
    return <Government />;
  } else if (sanitizeEntity.includes("hospital")) {
    return <Hospital />;
  }
  // else if (sanitizeEntity.includes("commercial")) {
  //     return <Office />;
  //   }
  return <Office />;
};
