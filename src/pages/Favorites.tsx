import PracticeView from './PracticeView'

// 收藏:復用練習版型,題庫範圍預先過濾為本機收藏題(SPEC §7.4)
export default function Favorites() {
  return <PracticeView mode="review" reviewStatus="favorite" reviewTitle="收藏" />
}
