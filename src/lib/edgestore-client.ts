"use client";

import { createEdgeStoreProvider } from "@edgestore/react";
import type { EdgeStoreRouter } from "./edgestore";

const { EdgeStoreProvider, useEdgeStore } =
  createEdgeStoreProvider<EdgeStoreRouter>();

export { EdgeStoreProvider, useEdgeStore };
