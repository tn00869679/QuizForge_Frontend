import PracticeView from './PracticeView'

// 錯題本:復用練習版型,題庫範圍預先過濾為本機答錯題(SPEC §7.4)
export default function WrongBook() {
  return <PracticeView mode="review" reviewStatus="wrong" reviewTitle="錯題本" />
}
