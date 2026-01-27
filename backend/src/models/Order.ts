import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface OrderAttributes {
  id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  installments: number | null;
  amount_per_installment: number | null;
  installments_paid: number;
  amount_paid: number;
  status:
    | "pending"
    | "authorized"
    | "active"
    | "shipped"
    | "completed"
    | "failed";
  current_mandate_id: string | null;
  order_items: any;
  shipping_address: string;
  created_at: Date;
}

interface OrderCreationAttributes extends Optional<
  OrderAttributes,
  | "id"
  | "installments_paid"
  | "amount_paid"
  | "current_mandate_id"
  | "created_at"
> {}

class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  public id!: string;
  public customer_id!: string;
  public vendor_id!: string;
  public total_amount!: number;
  public installments!: number | null;
  public amount_per_installment!: number | null;
  public installments_paid!: number;
  public amount_paid!: number;
  public status!:
    | "pending"
    | "authorized"
    | "active"
    | "shipped"
    | "completed"
    | "failed";
  public current_mandate_id!: string | null;
  public order_items!: any;
  public shipping_address!: string;
  public created_at!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "vendors",
        key: "id",
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    installments: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    amount_per_installment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    installments_paid: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "authorized",
        "active",
        "shipped",
        "completed",
        "failed",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    current_mandate_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "mandates",
        key: "id",
      },
    },
    order_items: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "orders",
    timestamps: false,
  },
);

export default Order;
