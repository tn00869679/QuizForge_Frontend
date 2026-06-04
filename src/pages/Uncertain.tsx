import PracticeView from './PracticeView'

// 不確定:復用練習版型,題庫範圍預先過濾為本機標記不確定題(SPEC §7.4)
export default function Uncertain() {
  return <PracticeView mode="review" reviewStatus="uncertain" reviewTitle="不確定" />
}
