using System;

//Q.How to prevent a class from being Inherited?
namespace How_to_prevent_a_class_from_being_Inherited
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }

    public sealed class Employee
    {
        public int Experience { get; set; }

        public void CalculateSalary()
        {
            int salary = Experience * 300000;

            Console.WriteLine("salary:{0} ", salary);
        }
    }

    //public class PermanentEmployee : Employee
    //{

    //}
}
