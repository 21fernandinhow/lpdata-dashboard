import { useSearchParams } from "react-router-dom"
import { ASSETS_TAB, HOME_TAB_PARAM } from "@/components/HomeTabs"
import { AssetsPage, LandingPagesPage } from "@/pages/lazy-pages"

// A página inicial: as landing pages ou os assets da conta, pela aba no endereço.
export default function HomePage() {
  const [searchParams] = useSearchParams()
  return searchParams.get(HOME_TAB_PARAM) === ASSETS_TAB ? <AssetsPage /> : <LandingPagesPage />
}
