<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# MoneyPilot

- All financial math lives in `src/lib/finance` (one shared calculation service) and every page reads results from it; UI components must not recompute totals, projections or shortfalls locally, because divergent numbers across pages break the product.
- A plan is never labelled feasible while the protected emergency reserve would be breached — options that violate that hard constraint are rejected and the shortfall is quantified instead, per the product spec.
- Keep the seven navigable pages as the whole app; integrate new comparison or history views into an existing page rather than adding an eighth route.
