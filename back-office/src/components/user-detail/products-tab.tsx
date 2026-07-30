import { useState } from 'react'
import { toast } from 'sonner'

import { DataTableRowActions } from '@/components/data-table/row-actions'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminService, type AdminProduct } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

type ProductsTabProps = {
  products: AdminProduct[]
}

export function ProductsTab({ products: initialProducts }: ProductsTabProps) {
  const [products, setProducts] = useState(initialProducts)

  async function handleDelete(id: number) {
    await adminService.deleteProduct(id)
    setProducts((current) => current.filter((p) => p.id !== id))
    toast.success('Produit supprimé.')
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Prix de vente</TableHead>
          <TableHead>Coût</TableHead>
          <TableHead>Marge</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              Aucun produit enregistré.
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => {
            const sellPrice = Number(product.sell_price)
            const costPrice = product.cost_price !== null ? Number(product.cost_price) : null
            const margin = costPrice !== null ? sellPrice - costPrice : null
            const isLowStock =
              product.tracks_stock && product.low_stock_threshold !== null && product.stock_quantity <= product.low_stock_threshold

            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.category?.name ?? 'Non catégorisé'}</TableCell>
                <TableCell>{currency.format(sellPrice)}</TableCell>
                <TableCell className="text-muted-foreground">{costPrice !== null ? currency.format(costPrice) : 'Non renseigné'}</TableCell>
                <TableCell className={margin !== null && margin < 0 ? 'text-destructive' : ''}>
                  {margin !== null ? currency.format(margin) : 'Non renseignée'}
                </TableCell>
                <TableCell>
                  {product.tracks_stock ? (
                    <Badge variant={isLowStock ? 'destructive' : 'outline'}>{product.stock_quantity}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Non suivi</span>
                  )}
                </TableCell>
                <TableCell>
                  <DataTableRowActions itemLabel={product.name} onDelete={() => handleDelete(product.id)} />
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
