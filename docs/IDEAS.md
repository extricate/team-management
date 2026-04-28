# Ideas
We require yearly financial input/editing for financial streams for up to many years in the future
- Projects (or other financial sources) contain financial sequences (per year) for up to 20 years in the future. Adding (or editing) these using the current functionality is too cumbersome/work intense. I want to be able to add financial tables to sources easily, with certain specified years with specified numbers (i.e. 2026, 2027, 2028 and then 2028 + 15 years (a total sum)).
- We split financial streams on personele exploitatie (persex), materiele exploitatie (matex) and investeringen (investments), all three are planned seperately (year-on-year) (but can be in the same table under their respective names)
- Currently we use excel documents and financial planning tools to manage the actual finances, but it's very hard to link them to personnel costs throughout our org, which is why we need this tool
- In all places where financial amounts are depicted it would be preferable that only the current year and maybe the next year is shown. Or figure out another way to improve UX legibility. 
- Additionally, for larger numbers the UI breaks now. Maybe reduce bigger numbers (i.e. 2.873.462 to 2.88m) and add the full number as an alt-text (or figure out a good UX practise)
- Remember, we're an org with over 700 employees. Pick appropriate financial volumes.
- Ideally the grid (or whatever best practise UX solution you pick) updates responsively to the input.
- If required you may introduce a job (with scheduler) or something else if there's a lot of computations that could better be done asynchronously, but I leave that up to you.
- Additionally, I'd like to see warnings/conflicts somewhere when allocations and financial (released) amounts do not correspond (fit financially). Perhaps also tied to the dates of the financial amounts (and their release times, and the allocations ).
- The einddatum dekking when financing positions can be infinite (but we only plan for 15 years in our org)


Auth: remove resend and implement basic username/password for management

Sync with AD groups?