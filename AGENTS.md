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

- Pair pastel surfaces with on-pastel/on-pastel-muted tokens and the pastel Button variant; neutral surfaces use their own foreground tokens to prevent theme-dependent contrast regressions.
- Dialog, alert-dialog and drawer content must explicitly set their surface foreground because they can be opened from pastel-colored pages.
