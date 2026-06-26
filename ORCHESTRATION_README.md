# 如何使用這套多 Agent 機制

## 一次性設置
1. 把這些檔案放進你的專案:`CLAUDE.md` 放在 repo 根目錄,其他全部依照標示的路徑放進 `.claude/`。
2. `chmod +x .claude/hooks/*.sh`
3. 確認 `jq` 已安裝(hooks 用它解析 Claude Code 傳來的 JSON)。

## 工作流程順序

**第 0 階段——先定資料契約。**
跟 Claude Code 說:「用 schema-architect subagent 確認或建立 routing-graph、codec-wire-format、building-record 這幾份資料契約。」只要做一次,之後動模組程式碼前都先讀這幾份 schema。

**第 1 階段——模組平行開工。**
因為各模組檔案邊界不重疊,可以在同一句話裡同時請多個 subagent 處理,Claude Code 會平行跑:
「用 agent-routing 修 Dijkstra 實作、agent-codec 修座標 round-trip、agent-i18n 修多語言綁定——這三個可以平行跑。」

**第 2 階段——關卡。**
routing 跟 codec 這兩個模組,subagent 回報完成後,要明確再下一句:「對 routing 模組跑 field-critical-verifier」(codec 也一樣)。即使模組 agent 自己說很有信心,也不要跳過這一步——這正是設置一個獨立檢查角色的意義。

**保險絲。**
就算你忘記手動要求驗證,Stop hook 也會自動擋下來——只要 routing 或 codec 資料夾的內容跟上次 verifier 通過時的版本不一樣,Claude Code 在這一輪結束前就會被攔截,並告訴你原因。如果這兩個模組從上次驗證通過後沒有再改動,這個 hook 完全不會打擾你做其他無關的事。

## 為什麼不用 Agent Teams
Claude Code 的 Agent Teams(實驗性的平行團隊功能)設計核心是讓 agent 自主認領任務、持續自動合併——這正是 routing 跟 codec 不該有的行為模式。Subagent 搭配上面這套不可繞過的驗證關卡,已經能讓低風險模組(i18n、視覺、軌道)平行進行,同時保證 field-critical 的修改永遠不會未經檢查就被合併。如果之後想在 i18n/visual/orbit 這幾個低風險模組上疊加 Agent Teams 換取更快的速度,可以考慮;但 routing 跟 codec 建議始終維持在 subagent + hook 關卡這個模式上。
